import { AsyncLocalStorage } from "node:async_hooks";
export const requestContext = new AsyncLocalStorage<Headers>();
export async function headers(){return requestContext.getStore()??new Headers();}
export function redirect(path:string):never {throw new Error(`Unexpected test redirect: ${path}`);}
