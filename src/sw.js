self.addEventListener('push', event => {
    const data = event.data.json();
    const { title, options } = data;
    event.waitUntil(self.registration.showNotification(title, options));
});