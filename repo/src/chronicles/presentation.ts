/** Geometry shared by the viewer and director; all coordinates are stage pixels. */
export interface Box { x:number; y:number; width:number; height:number; }
export function fitPicture(width:number,height:number,box:Box):Box {
  const factor=Math.min(box.width/Math.max(1,width),box.height/Math.max(1,height));
  const w=Math.max(0,width*factor),h=Math.max(0,height*factor);
  return {x:box.x+(box.width-w)/2,y:box.y+(box.height-h)/2,width:w,height:h};
}
/** Keep decorative stickers in one original row, preserving order and click targets. */
export function packStickers(items:{x:number;width:number}[],left:number,right:number,gap:number):number[]{
  const sorted=items.map((item,index)=>({...item,index})).sort((a,b)=>a.x-b.x);
  const occupied=sorted.reduce((n,item)=>n+item.width,0)+Math.max(0,sorted.length-1)*gap;
  const factor=Math.min(1,(right-left)/Math.max(1,occupied));
  let cursor=left;
  const xs=sorted.map(item=>{const half=item.width*factor/2;const x=Math.max(item.x,cursor+half);cursor=x+half+gap*factor;return x;});
  cursor=right;
  for(let i=xs.length-1;i>=0;i--){const half=sorted[i].width*factor/2;xs[i]=Math.min(xs[i],cursor-half);cursor=xs[i]-half-gap*factor;}
  const result:number[]=[];sorted.forEach((item,i)=>result[item.index]=xs[i]);return result;
}
export function typedBadge(name:string,title:string,elapsed:number,enabled=true):{name:string;title:string;count:number}{
  const fullName=`[ ${name.toUpperCase().trim()} ]`,fullTitle=`[ ${title.toUpperCase().trim()} ]`;
  const count=enabled?Math.max(0,Math.min(fullName.length+fullTitle.length,Math.floor(elapsed*32))):fullName.length+fullTitle.length;
  return {name:count<fullName.length?fullName.slice(0,count)+'▌':fullName,title:count<fullName.length?'':count<fullName.length+fullTitle.length?fullTitle.slice(0,count-fullName.length)+'▌':fullTitle,count};
}
