/** Test-only target selection. Dedicated tire variables do not collide with
 * partner tests using the historic generic namespace. Legacy tire runners
 * remain supported, but no partial pair or foreign target is accepted. */
export function readTireTestEnvironment(env:Record<string,string|undefined>){
  const specific=Boolean(env.FCM_TIRE_TEST_ADMIN_URL||env.FCM_TIRE_TEST_APP_URL)
  const adminUrl=specific?env.FCM_TIRE_TEST_ADMIN_URL:env.FCM_TEST_ADMIN_DATABASE_URL
  const appUrl=specific?env.FCM_TIRE_TEST_APP_URL:env.FCM_TEST_DATABASE_URL
  if(Boolean(adminUrl)!==Boolean(appUrl))throw new Error('Both isolated tire test URLs required')
  for(const value of [adminUrl,appUrl])if(value){
    let url:URL
    try{url=new URL(value)}catch{throw new Error('Invalid isolated tire test target')}
    if(url.protocol!=='postgresql:'||url.hostname!=='127.0.0.1'||url.pathname!=='/fcm_tire_s8')throw new Error('Disposable loopback tire database required')
  }
  return {adminUrl,appUrl}
}
