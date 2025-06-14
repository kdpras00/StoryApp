const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "src/sw.js"),
          to: path.resolve(__dirname, "dist"),
        },
        {
          from: path.resolve(__dirname, "src/favicon.ico"),
          to: path.resolve(__dirname, "dist"),
        },
        {
          from: path.resolve(__dirname, "src/offline.html"),
          to: path.resolve(__dirname, "dist"),
        },
        {
          from: path.resolve(__dirname, "src/manifest.json"),
          to: path.resolve(__dirname, "dist"),
        },
        {
          from: path.resolve(__dirname, "public/icons/icon-144x144.png"),
          to: path.resolve(__dirname, "dist/icons/icon-144x144.png"),
        },
        {
          from: path.resolve(__dirname, "public/icons/icon-192x192.png"),
          to: path.resolve(__dirname, "dist/icons/icon-192x192.png"),
        },
        {
          from: path.resolve(__dirname, "public/icons/error-icon-72x72.png"),
          to: path.resolve(__dirname, "dist/icons/error-icon-72x72.png"),
        },
        {
          from: path.resolve(__dirname, "public/screenshots/dekstop.png"),
          to: path.resolve(__dirname, "dist/screenshots/dekstop.png"),
        },
        {
          from: path.resolve(__dirname, "public/screenshots/mobile.png"),
          to: path.resolve(__dirname, "dist/screenshots/mobile.png"),
        },
      ],
    }),
  ],
};
