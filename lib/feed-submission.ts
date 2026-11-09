// Only atomic validation failures are editable; transport failures retain the original retry.
export function feedSubmissionRejected(status:number,body:{code?:string;error?:string}):boolean{
 if(/retry|identifier|different.*period|another.*period/i.test(body.error||''))return false;
 return status===400||status===409&&['23514','40001'].includes(body.code||'');
}
