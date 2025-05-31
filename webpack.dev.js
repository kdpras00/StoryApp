const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "development",
  devServer: {
    // Try this explicit IPv4 address if "localhost" isn't working
    // host: "127.0.0.1",
    host: "localhost",
    port: 3000,
    // Uncomment these lines if WebSocket issues persist
    // hot: false,
    // liveReload: false,
    client: {
      overlay: true,
      progress: true,
    },
    watchFiles: ["src/**/*", "public/**/*"],
    open: true,
    static: "./dist",
  },
});
