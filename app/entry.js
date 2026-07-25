import Router from './router.js';
import routes from './routes.js';

/* ── App bootstrap ───────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded');

    // Create the Vue app shell (keeps upperBar, instrumentsBar, grid layout)
    const app = new Vue({
        el: '#root',
        template: `
            <div id="roots">
                <div id="upperBar"></div>
                <div id="instrumentsBar"></div>

                <div id="notabsolute">
                    <div id="editor"></div>
                    <div id="preview"></div>
                </div>
            </div>
        `,
        data: function () {
            return {};
        },
    });

    // Mount the hash router onto the #editor container
    const router = new Router({
        container: document.getElementById('editor'),
        routes,
    });

    router.init();
});
