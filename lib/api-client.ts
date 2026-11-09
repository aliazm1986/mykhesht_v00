export async function readJson<T=Record<string,unknown>>(response:Response):Promise<T>{return await response.json() as T;}
