document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOMContentLoaded");

    const app = new Vue({
        el: "#root",
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
            return {
            };
        }
    });
})
