/** Lift faded ink on predominantly white pages; leave dark or photographic sources unchanged. */
export function recoverFadedInk(data:Uint8ClampedArray):boolean {
  let white=0;
  for(let i=0;i<data.length;i+=16)if(Math.min(data[i],data[i+1],data[i+2])>245)white++;
  if(!data.length||white/(Math.ceil(data.length/16))<=.55)return false;
  for(let i=0;i<data.length;i+=4){const l=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];const v=l<242?0:255;data[i]=data[i+1]=data[i+2]=v;}
  return true;
}
