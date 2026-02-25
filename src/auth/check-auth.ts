import { auth } from "../firebase-init";

document.addEventListener('DOMContentLoaded', function () {
    auth.onAuthStateChanged(user => {
        // Paths that are publicly accessible to anyone, including anonymous users
        const publicPaths = ['/', '/index.html', '/auth/login.html'];
        const currentPath = window.location.pathname;

        const isPublicPath = publicPaths.includes(currentPath);

        if (!user || user.isAnonymous) {
            // User is not logged in, or is logged in anonymously
            if (!isPublicPath) {
                // Determine base URL properly if nested
                window.location.href = `/auth/login.html?redirect=${encodeURIComponent(currentPath)}`;
            }
        } else {
            // User is logged in with a real account
            if (currentPath === '/auth/login.html') {
                // If they are on the login page but already logged in, redirect to the parameter or root
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                window.location.href = redirect || '/';
            }
        }
    });
});
