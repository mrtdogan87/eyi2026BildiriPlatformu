const submissions:Record<string,string>={DRAFT:'Taslak',SUBMITTED:'Gönderildi',UNDER_REVIEW:'İnceleniyor',ACCEPTED:'Kabul edildi',REJECTED:'Reddedildi'};
export const submissionStatus=(value:string)=>submissions[value]??value;
