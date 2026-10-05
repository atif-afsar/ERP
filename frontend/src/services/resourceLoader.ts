export async function loadResources(resources: Record<string, () => Promise<{data: unknown}>>) {
 const entries=Object.entries(resources),results=await Promise.allSettled(entries.map(([,load])=>load()));
 const data:Record<string,unknown>={},errors:Record<string,string>={};
 results.forEach((r,i)=>{const key=entries[i][0];if(r.status==='fulfilled')data[key]=r.value.data;else errors[key]=r.reason?.message||`Unable to load ${key}.`;});
 return {data,errors};
}
