import numpy as np
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
p=Path(__file__).parent;z=np.load(p/'lead-activations.npz');t=z['t'];N=z['notes'];X=z['X']
for a,b in [(28,56),(56,84),(100,140),(140,175),(175,210),(210,245),(245,280),(280,297)]:
 fig,ax=plt.subplots(figsize=(20,7));sel=(t>=a)&(t<b);ax.pcolormesh(t[sel],N,np.log1p(X[:,sel]*30),cmap='magma',vmin=0,vmax=2);ax.set_yticks(N);names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];ax.set_yticklabels([names[n%12]+str(n//12-1) for n in N]);ax.set_xticks(np.arange(a,b,.5));ax.tick_params(axis='x',rotation=90);ax.grid(alpha=.2);fig.tight_layout();fig.savefig(p/f'activation-{a}.png');plt.close(fig)
