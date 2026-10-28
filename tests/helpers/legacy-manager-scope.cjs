// Existing workflow fixtures explicitly represent pre-activation accounts.
exports.resolveManagerScope=async(actor,business)=>({actorId:actor.id,business,mode:actor.role==='admin'?'admin_all':'legacy',managerId:actor.id,periodId:null,status:'active',startsOn:null});
exports.readManagerRecords=async()=>{throw Error('Legacy fixture unexpectedly used a personal scoped read');};
