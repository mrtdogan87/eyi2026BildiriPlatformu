// Existing local integration scenarios select a congress deliberately.
// UI11 requires a recorded reason for a platform selection; the raw UI11 suite
// separately verifies that a request without this reason fails.
export function contextRequestBody(path,body){
 return path==='/api/platform/context'&&body?.congressId&&body.reason===undefined
  ? {...body,reason:'Yerel otomatik regresyon: sentetik kongre kontrolü'}:body;
}
