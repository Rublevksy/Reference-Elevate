"""
Oprava hero filmu: ukazující prst maskota zasahoval do displeje notebooku
(na displej web kreslí screenshot → prst jako by displej „propichoval").
Ruka se ve snímcích 118–286 posune doleva tak, aby špička skončila před
rámečkem; scéna mimo ruku (lampa, okno, neon, notebook) zůstává beze změny.

Postup (jednorázový, výsledek je v public/hero/frames-desktop/*.webp),
pracovní složka v proměnné WORK:
  1. ffmpeg -i reference/hero-keyframes/hero-single.mp4 $WORK/raw/f_%04d.png
  2. .venv-tools/bin/python3 scripts/fix-hero-hand.py segment   (maska postavy)
  3. .venv-tools/bin/python3 scripts/fix-hero-hand.py all       (oprava snímků)
  4. .venv-tools/bin/python3 scripts/fix-hero-hand.py encode    (1600 px WebP q82)

Jak: přesná alfa ruky (closed-form matting z hrubé masky), posun paže
rostoucí od ramene (0) k zápěstí (D), ruka tuhá; uvolněné místo se doplní
čistým podkladem ze snímků 112–128 (medián, víko už stojí; při jízdě kamery
přenesený homografií displeje a doladěný posunem) přes Poissonovu membránu,
pás lemu a rámečku podél hrany ze stejného snímku.
"""

import sys, re, json, os
import numpy as np, cv2
from PIL import Image
from scipy.ndimage import maximum_filter1d, gaussian_filter1d
from pymatting import estimate_alpha_cf, estimate_foreground_ml

SP=os.environ.get('WORK','/tmp/hero-hand')
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S=1.2
MARGIN=12.0
src=open(f'{ROOT}/lib/heroScreenTrack.ts').read()
ROWS=[list(map(float,m.group(1).split(','))) for m in re.finditer(r'\[([-\d., ]+)\]',src) if len(m.group(1).split(','))==8]

def quad(f):
    r=[v*S for v in ROWS[max(0,f-98)]]
    return np.float32([[r[0],r[1]],[r[2],r[3]],[r[4],r[5]],[r[6],r[7]]])

def raw(f): return np.asarray(Image.open(f'{SP}/raw/f_{f+1:04d}.png').convert('RGB')).astype(np.float32)/255.
def matte(f): return np.asarray(Image.open(f'{SP}/matte/m_{f:03d}.png').convert('L')).astype(np.float32)/255.

def penetration(a,Q,thr=0.2):
    ys,xs=np.nonzero(a>thr)
    TL,TR,BR,BL=Q
    t=(ys-TL[1])/(BL[1]-TL[1]); xl=TL[0]+(BL[0]-TL[0])*t
    tt=(xs-TL[0])/(TR[0]-TL[0]); yt=TL[1]+(TR[1]-TL[1])*tt
    inside=(ys>=TL[1])&(ys<=BL[1])&(xs>=xl)&(xs<=TR[0])&(ys>=yt)
    if inside.sum()<8: return 0.0
    return float(np.percentile(xs[inside]-xl[inside],99.5))

def schedule(F0=118,F1=300):
    pen={}
    for f in range(F0,F1+1):
        pen[f]=penetration(matte(f),quad(f))
    fs=np.arange(F0,F1+1)
    # jen ukazování (od 126); otevírání víka (106–109) řeší pozdější rozsvícení webu
    Draw=np.array([pen[f]+MARGIN if (pen[f]>0 and f>=126) else 0.0 for f in fs])
    D=maximum_filter1d(Draw,11)
    D=gaussian_filter1d(D,3.5)
    D=np.maximum(D,Draw)
    return {int(f):float(d) for f,d in zip(fs,D)}, pen

def build_plate(frames=range(112,129),box=(420,300,1240,960)):
    """Čistý podklad (víko už stojí): medián přes snímky, kde je ruka daleko (≥ 20 px) —
    medián potlačí rozmazané zbytky pohybující se ruky."""
    x0,y0,x1,y1=box
    stack=[];oks=[]
    for f in frames:
        im=raw(f)[y0:y1,x0:x1]
        a=cv2.dilate(matte(f),np.ones((41,41),np.uint8))[y0:y1,x0:x1]
        stack.append(im); oks.append(a<0.01)
    st=np.stack(stack); ok=np.stack(oks)
    st=np.where(ok[...,None],st,np.nan)
    med=np.nanmedian(st,axis=0)
    found=ok.any(0)
    best=np.zeros((1080,1920,3),np.float32); valid=np.zeros((1080,1920),np.float32)
    med=np.nan_to_num(med)
    # díry (ruka tu byla ve všech snímcích) doplnit z okolní čisté stěny — hladce
    hole=(~found).astype(np.uint8)
    if hole.any():
        m8=(np.clip(med,0,1)*255).astype(np.uint8)
        med=cv2.inpaint(m8,hole,12,cv2.INPAINT_TELEA).astype(np.float32)/255.
    best[y0:y1,x0:x1]=med; valid[y0:y1,x0:x1]=1.0
    return best, valid

def smooth(t): 
    t=np.clip(t,0,1); return t*t*(3-2*t)

def process(f,D,plate,valid,P0,debug=False):
    img=raw(f); a0=matte(f); Q=quad(f)
    H,W=a0.shape
    ys,xs=np.nonzero(a0>0.5)
    xt=int(xs.max()); yt=int(np.median(ys[xs>=xt-3]))
    # rameno: první sloupec (zprava), kde postava zabírá výšku trupu
    top=max(0,yt-420); bot=min(H,yt+120)
    cov=(a0[top:bot]>0.5).sum(0)
    xsh=0
    for x in range(xt,0,-1):
        if cov[x]>220: xsh=x; break
    armcols=np.arange(xsh,xt+1)
    band=(a0[:,xsh:xt+1]>0.5)
    rr=np.nonzero(band.any(1))[0]
    y0=max(0,int(rr.min())-40); y1=min(H,int(rr.max())+40)
    x0=max(0,xsh-40); x1=min(W,xt+int(D)+70)
    roi=(slice(y0,y1),slice(x0,x1))
    I=img[roi]; A=a0[roi]
    h,w=A.shape
    # trimapa → přesná alfa (closed-form) jen kolem ruky
    core=(A>0.5).astype(np.uint8)
    ell=lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(r,r))
    fg=cv2.erode((A>0.7).astype(np.uint8),ell(7))
    near=cv2.dilate(core,ell(21))
    tri=np.full(A.shape,0.5,np.float64); tri[fg>0]=1; tri[near==0]=0
    TLq,TRq,BRq,BLq=Q
    yy0,xx0=np.mgrid[0:h,0:w].astype(np.float32)
    xlq=TLq[0]+(BLq[0]-TLq[0])*((yy0+y0)-TLq[1])/(BLq[1]-TLq[1])
    rimZone=(((xx0+x0)-xlq)>-18)&(((xx0+x0)-xlq)<14)
    tri[rimZone&(cv2.dilate(core,ell(5))==0)]=0
    alpha=estimate_alpha_cf(I.astype(np.float64),tri).astype(np.float32)
    alpha=np.clip(alpha,0,1)
    alpha=np.where(alpha<0.03,0,alpha)
    # Hrubá maska slila prst s pěstí včetně kusu stříbrného lemu víka pod prstem.
    # Nad modrým displejem je prst ostře vidět: z něj osa a tloušťka prstu,
    # a v pásu u lemu smí patřit ruce jen tenhle prst.
    TLf,_,_,BLf=Q
    xl_y=TLf[0]+(BLf[0]-TLf[0])*(yt-TLf[1])/(BLf[1]-TLf[1])
    cx_=[];cc_=[];tt_=[]
    for gx in range(int(xl_y+4),int(xt-8)):
        cx=gx-x0
        if not (0<=cx<w): continue
        r0=max(0,yt-y0-45); r1=min(h,yt-y0+45)
        col=np.nonzero(alpha[r0:r1,cx]>0.5)[0]
        if len(col)>=4:
            cx_.append(gx); cc_.append(r0+(col[0]+col[-1])/2); tt_.append(col[-1]-col[0]+1)
    if len(cx_)>=6:
        b_,a_=np.polyfit(cx_,cc_,1)
        T=float(np.median(tt_))
        gxs2=np.arange(w,dtype=np.float32)+x0
        yyy=np.arange(h,dtype=np.float32)[:,None]
        cline=a_+b_*gxs2[None,:]
        inBand=np.abs(yyy-cline)<=T/2+3
        # jen samotný lem a rámeček (pěst tam nesahá); měkká hranice pásu
        zw=np.clip((gxs2-(xl_y-16))/3.0,0,1)[None,:]
        rowsZ=(np.abs(yyy-(yt-y0))<70)
        kill=zw*rowsZ*(~inBand)
        alpha=alpha*(1-kill)
    Fg,Bg=estimate_foreground_ml(I.astype(np.float64),alpha.astype(np.float64),return_background=True)
    Fg=Fg.astype(np.float32); Bg=Bg.astype(np.float32)
    # barva okraje: kde byla za rukou stěna (stejná jako po posunu), zůstává původní
    # pixel; jen kde za prstem svítil modrý displej, se okraj přebarví barvou kůže
    blueBg=np.clip(((Bg[...,2]-np.maximum(Bg[...,0],Bg[...,1]))-0.05)/0.15,0,1)
    blueBg=cv2.dilate(blueBg,np.ones((9,9),np.uint8))
    coreA=(alpha>0.85).astype(np.float32)
    wc=cv2.GaussianBlur(coreA,(0,0),3.0)+1e-4
    Fc=cv2.GaussianBlur(Fg*coreA[...,None],(0,0),3.0)/wc[...,None]
    rim=(np.clip((0.97-alpha)/0.45,0,1)*blueBg*(wc>0.02))[...,None]
    Fg=np.where((alpha>0.02)[...,None],Fg,I)
    Fg=Fg*(1-rim)+Fc*rim
    # mimo modrý displej brát pro okraj přímo původní pixel (vypadá jako originál)
    keep=((1-blueBg)*(alpha<0.9))[...,None]
    Fg=Fg*(1-keep)+I*keep
    # Ukazováček: úsek, který ležel na lemu víka, rámečku a displeji, má posunutý
    # odstín (světlý pruh, modrý odlesk). Nízkofrekvenční korekce: průměr vnitřku
    # prstu v každém úseku srovnat s čistým úsekem před lemem (tvar a stíny zůstávají).
    TLq2,_,_,BLq2=Q
    xl_t=TLq2[0]+(BLq2[0]-TLq2[0])*(yt-TLq2[1])/(BLq2[1]-TLq2[1])
    rr0=max(0,yt-y0-45); rr1=min(h,yt-y0+45)
    gxs=np.arange(w,dtype=np.float32)+x0
    inner=(alpha[rr0:rr1]>0.8)
    def zmean(lo,hi):
        m=inner&((gxs>=lo)&(gxs<hi))[None,:]
        return (Fg[rr0:rr1][m].mean(0) if m.sum()>=15 else None)
    ref=zmean(xl_t-52,xl_t-20)
    if ref is not None:
        offs=np.zeros((w,3),np.float32)
        for lo,hi in ((xl_t-20,xl_t-7),(xl_t-7,xl_t+1),(xl_t+1,xt+2)):
            mz=zmean(lo,hi)
            if mz is not None:
                sel=(gxs>=lo)&(gxs<hi)
                offs[sel]=np.clip(ref-mz,-0.12,0.12)
        from scipy.ndimage import gaussian_filter1d as g1
        offs=g1(offs,3.0,axis=0)
        wgt=np.clip(alpha/0.4,0,1)[...,None]
        rowsel=np.zeros((h,1,1),np.float32); rowsel[rr0:rr1]=1
        Fg=np.clip(Fg+offs[None,:,:]*wgt*rowsel,0,1)
    # posun: 0 u ramene → D od zápěstí
    X=np.arange(w,dtype=np.float32)+x0
    xw=xt-0.32*(xt-xsh)
    wgt=smooth((X-(xsh+10))/max(1.0,(xw-(xsh+10))))
    d=(D*wgt).astype(np.float32)
    mapx=np.tile((np.arange(w,dtype=np.float32)+d)[None,:],(h,1))
    mapy=np.tile(np.arange(h,dtype=np.float32)[:,None],(1,w))
    # jen paže: sledovat souvislý úsek masky od špičky prstu k rameni —
    # hlava, trup a nohy zůstávají netknuté
    armCore=np.zeros((h,w),np.uint8)
    prev=(yt-y0-6,yt-y0+6); thick=[]
    for cx in range(int(xt-x0),int(xsh-x0)-1,-1):
        colm=A[:,cx]>0.5
        if not colm.any(): break
        d_=np.diff(np.concatenate([[0],colm.astype(np.int8),[0]]))
        st=np.nonzero(d_==1)[0]; en=np.nonzero(d_==-1)[0]
        ov=[min(e,prev[1])-max(s_,prev[0]) for s_,e in zip(st,en)]
        j=int(np.argmax(ov))
        if ov[j]<=-4: break
        s_,e=st[j],en[j]
        if cx+x0<xsh+30:
            s_=max(s_,prev[0]-12); e=min(e,prev[1]+12)
        armCore[s_:e,cx]=1; prev=(s_,e)
    armMask=cv2.dilate(armCore,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31))).astype(np.float32)
    armOnly=alpha*(X[None,:]>=xsh-2)*armMask
    armOnly=np.where(armOnly<0.1,0,armOnly)
    a_new=cv2.remap(armOnly,mapx,mapy,cv2.INTER_LINEAR,borderValue=0)
    F_new=cv2.remap(Fg,mapx,mapy,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
    # --- čisté pozadí pod CELOU původní rukou: podklad + membrána (Poisson),
    #     takže jas na hranici sedí a nevznikají švy ---
    # výplň přes celý měkký okraj staré ruky (i slabé alfy rozmazaného okraje),
    # jinak by za prstem zůstal bledý „duch"
    softOld=((np.maximum(alpha,A)>0.02)&(armMask>0)&(X[None,:]>=xsh-2)).astype(np.uint8)
    oldM=cv2.dilate(np.maximum((armOnly>0.02).astype(np.uint8),softOld),np.ones((9,9),np.uint8))
    oldM[:, :max(0,int(xsh-x0)-2)]=0
    oldM[0,:]=0; oldM[-1,:]=0; oldM[:,0]=0; oldM[:,-1]=0
    Hm=cv2.getPerspectiveTransform(P0,Q) if f>165 else np.eye(3)
    Tr=np.float64([[1,0,-x0],[0,1,-y0],[0,0,1]])
    Hr=Tr@Hm
    pl=cv2.warpPerspective(plate,Hr,(w,h),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
    pv=cv2.warpPerspective(valid,Hr,(w,h),flags=cv2.INTER_LINEAR,borderValue=0)
    pv=(pv>0.999)
    if f>165:
        # homografie displeje nesedí na rámeček přesně (±2–3 px) — doladit posun
        # podle viditelného okolí hrany nad a pod prstem (mimo ruku)
        TL,TR,BR,BL=Q
        yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
        xl=TL[0]+(BL[0]-TL[0])*((yy+y0)-TL[1])/(BL[1]-TL[1])
        win=(np.abs((xx+x0)-xl)<40)&(np.abs((yy+y0)-yt)<160)&(cv2.dilate(oldM,np.ones((9,9),np.uint8))==0)&pv
        best=(1e9,0.0,0.0)
        if win.sum()>200:
            for dy in np.arange(-5,5.5,0.5):
                for dx in np.arange(-5,5.5,0.5):
                    M=np.float32([[1,0,dx],[0,1,dy]])
                    sh=cv2.warpAffine(pl,M,(w,h),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
                    e=((sh[win]-I[win])**2).mean()
                    if e<best[0]: best=(e,dx,dy)
            M=np.float32([[1,0,best[1]],[0,1,best[2]]])
            pl=cv2.warpAffine(pl,M,(w,h),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
    src=np.where(pv[...,None],pl,Bg).astype(np.float32)
    TL,TR,BR,BL=Q
    ev=np.float32([BL[0]-TL[0],BL[1]-TL[1]]); ev/=np.linalg.norm(ev)
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    xl=TL[0]+(BL[0]-TL[0])*((yy+y0)-TL[1])/(BL[1]-TL[1])
    bandM=(((xx+x0)-xl)>-17)&(((xx+x0)-xl)<5)&(oldM>0)&(f>165)
    by,bx=np.nonzero(bandM)
    if len(by):
        excl=oldM>0
        res_=[]
        for sgn in (-1,1):
            found=np.full(len(by),-1.0); col=np.zeros((len(by),3),np.float32)
            for k in range(1,300):
                px=np.clip(np.round(bx+sgn*k*ev[0]).astype(int),0,w-1)
                py=np.clip(np.round(by+sgn*k*ev[1]).astype(int),0,h-1)
                ok=(found<0)&(~excl[py,px])
                found[ok]=k; col[ok]=I[py[ok],px[ok]]
                if (found>=0).all(): break
            res_.append((found,col))
        (du,cu),(dd,cd)=res_
        both=(du>0)&(dd>0)
        wu=np.where(both,dd/(du+dd+1e-6),np.where(du>0,1.0,0.0))[:,None]
        has=(du>0)|(dd>0)
        src[by[has],bx[has]]=(cu*wu+cd*(1-wu))[has]
    B=I.copy()
    idx=np.flatnonzero(oldM.ravel())
    if len(idx):
        from scipy.sparse import coo_matrix
        from scipy.sparse.linalg import splu
        n=len(idx); pos=-np.ones(h*w,np.int64); pos[idx]=np.arange(n)
        diff=(I-src).reshape(-1,3)
        rows_=[];cols_=[];vals_=[];rhs=np.zeros((n,3),np.float64)
        iy,ix=np.divmod(idx,w)
        rows_.append(np.arange(n));cols_.append(np.arange(n));vals_.append(np.full(n,4.0))
        for dy,dx in ((-1,0),(1,0),(0,-1),(0,1)):
            ny=iy+dy; nx=ix+dx; nid=ny*w+nx
            inside=pos[nid]>=0
            rows_.append(np.arange(n)[inside]); cols_.append(pos[nid[inside]]); vals_.append(np.full(inside.sum(),-1.0))
            rhs[~inside]+=diff[nid[~inside]]
        A=coo_matrix((np.concatenate(vals_),(np.concatenate(rows_),np.concatenate(cols_))),shape=(n,n)).tocsc()
        lu=splu(A)
        u=np.stack([lu.solve(rhs[:,c]) for c in range(3)],1).astype(np.float32)
        Bf=B.reshape(-1,3); Sf=src.reshape(-1,3)
        Bf[idx]=np.clip(Sf[idx]+u,0,1)
        B=Bf.reshape(h,w,3)
    comp=F_new*a_new[...,None]+B*(1-a_new[...,None])
    region=(oldM>0)|(a_new>0.004)
    out=I.copy()
    out[region]=comp[region]
    res=img.copy(); res[roi]=out
    info=dict(xt=xt,xsh=xsh,D=D,roi=[x0,y0,x1,y1],penAfter=penetration(np.pad(a_new,((y0,H-y1),(x0,W-x1))),Q))
    return res,info


def segment(a=90,b=330):
    from rembg import new_session, remove
    os.makedirs(f'{SP}/matte',exist_ok=True)
    sess=new_session('u2net_human_seg')
    for i in range(a,b+1):
        out=f'{SP}/matte/m_{i:03d}.png'
        if not os.path.exists(out):
            remove(Image.open(f'{SP}/raw/f_{i+1:04d}.png').convert('RGB'),session=sess,only_mask=True).save(out)


def encode():
    import glob
    for p in sorted(glob.glob(f'{SP}/fixed/f_*.png')):
        f=int(p.split('_')[-1][:3])
        Image.open(p).convert('RGB').resize((1600,900),Image.LANCZOS).save(f'{ROOT}/public/hero/frames-desktop/{f:03d}.webp','WEBP',quality=82,method=6)

if __name__=='__main__':
    mode=sys.argv[1]
    if mode=='segment':
        segment(); sys.exit(0)
    if mode=='encode':
        encode(); sys.exit(0)
    sched,pen=schedule()
    os.makedirs(f'{SP}/fin',exist_ok=True)
    json.dump({'D':sched,'pen':pen},open(f'{SP}/fin/schedule.json','w'))
    plate,valid=build_plate()
    P0=quad(126)
    frames=[int(x) for x in sys.argv[2].split(',')] if mode=='test' else [f for f,d in sched.items() if d>0.4]
    os.makedirs(f'{SP}/fixed',exist_ok=True)
    for f in frames:
        D=sched.get(f,0.0)
        if D<=0.4: print(f,'skip'); continue
        res,info=process(f,D,plate,valid,P0)
        Image.fromarray((np.clip(res,0,1)*255+0.5).astype(np.uint8)).save(f'{SP}/fixed/f_{f:03d}.png')
        print(f,json.dumps(info),flush=True)
