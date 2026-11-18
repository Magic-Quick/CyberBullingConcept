import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=ts.transpileModule(await readFile(new URL('./presentation.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {fitPicture,packStickers,typedBadge}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('wide and tall screenshots use the largest uncropped rectangle at every viewport ratio',()=>{
  for(const [w,h] of [[1920,800],[1280,720],[414,896],[844,390]])for(const [sw,sh] of [[2000,350],[500,1800],[1280,720]]){
    const box={x:20,y:100,width:w-40,height:Math.max(1,h-230)},fit=fitPicture(sw,sh,box);
    assert.ok(fit.x>=box.x-.001&&fit.y>=box.y-.001);
    assert.ok(fit.x+fit.width<=box.x+box.width+.001&&fit.y+fit.height<=box.y+box.height+.001);
    assert.ok(Math.abs(fit.width/fit.height-sw/sh)<1e-6);
    assert.ok(Math.abs(fit.width-box.width)<.001||Math.abs(fit.height-box.height)<.001,'one available edge must be reached');
  }
});
test('nearby verdict, reward and song stickers keep separate click targets',()=>{
  const items=[{x:20,width:30},{x:80,width:35},{x:900,width:36},{x:919,width:34},{x:925,width:32}],xs=packStickers(items,0,960,10);
  for(let i=0;i<xs.length;i++){assert.ok(xs[i]-items[i].width/2>=0);assert.ok(xs[i]+items[i].width/2<=960);if(i)assert.ok(xs[i]-items[i].width/2>=xs[i-1]+items[i-1].width/2+10-.001);}
});
test('original badge types the name then title at 32 characters per second and completes on seek',()=>{
  const start=typedBadge('Егор','Толкователь',0),half=typedBadge('Егор','Толкователь',.25),end=typedBadge('Егор','Толкователь',100);
  assert.deepEqual(start,{name:'▌',title:'',count:0});assert.equal(half.name,'[ ЕГОР ]');assert.equal(half.title,'▌');assert.equal(end.title,'[ ТОЛКОВАТЕЛЬ ]');assert.equal(typedBadge('Егор','Толкователь',0,false).title,end.title);
});
