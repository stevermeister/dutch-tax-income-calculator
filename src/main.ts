import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));


// temporary solution to clean up cache from the old version 
// async function cleanAllCache() {
//     console.log('Started cleanup');
//     const cacheNames = await caches.keys();
//     for (const cacheName of cacheNames) {
//         if(cacheName.slice(0,27) === 'dutch-tax-income-calculator') {
//           await caches.delete(cacheName);
//           console.log(`Cache with key ${cacheName} deleted`)
//         }
//     }
// }
// cleanAllCache();