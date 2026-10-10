async function run() {
    console.log("Making request to local dev server...");
    try {
        const res = await fetch('http://localhost:3000/api/platform/tenants/c2ac2a1a-504a-4f74-9059-e0c986cdf16a/users', {
            headers: {
                'Cookie': 'platform_admin_session=authenticated'
            }
        });
        console.log("Status:", res.status);
        console.log("Headers:", Object.fromEntries(res.headers.entries()));
        const body = await res.text();
        console.log("Body:", body);
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

// Wait a bit for the dev server to be fully warm
setTimeout(run, 1500);
