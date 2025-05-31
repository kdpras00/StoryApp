const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "development",
  devServer: {
    host: "localhost",
    port: 8080,
    hot: true,
    client: {
      webSocketURL: {
        hostname: "localhost",
        pathname: "/ws",
        port: 8080,
        protocol: "ws",
      },
      overlay: true,
      progress: true,
    },
    watchFiles: ["src/**/*", "public/**/*"],
    open: true,
    static: "./dist",
  },
});
