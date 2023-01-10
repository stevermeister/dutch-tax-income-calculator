// temporary solution to clean up cache from the old version
const version = "cleaup";

self.addEventListener("install", (e) => {
  e.waitUntil(async function () {
    console.log("Started cleanup");
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      if (cacheName.slice(0, 27) === "dutch-tax-income-calculator") {
        await caches.delete(cacheName);
        console.log(`Cache with key ${cacheName} deleted`);
      }
    }
  });
});
