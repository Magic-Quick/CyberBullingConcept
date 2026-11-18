import { getAudioUrl, getImageUrl } from '../assetsManager';
import type { Project } from './model';

const files=import.meta.glob('../../../media/interactive/**/*.{mp3,png,jpg,jpeg,webp,svg}', {query:'?url',import:'default',eager:true}) as Record<string,string>;
const gui=import.meta.glob('../../../media/visual/generated/Gui/**/*.{png,jpg,jpeg,webp,svg}', {query:'?url',import:'default',eager:true}) as Record<string,string>;
const byPath=new Map<string,string>();
for(const [path,url] of Object.entries({...files,...gui}))byPath.set(path.replace(/^\.\.\/\.\.\/\.\.\//,''),url);
export function assetUrl(project: Project, id: string): string|undefined {
  const a=project.assets.find(a=>a.id===id);if(!a)return undefined;
  if(a.key)return a.kind==='audio'?getAudioUrl(a.key):getImageUrl(a.key);
  if(!a.path)return undefined;
  return byPath.get(a.path.replace(/\\/g,'/').replace(/^\.\//,''));
}
