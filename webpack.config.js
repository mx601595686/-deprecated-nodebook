const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanCSSPlugin = require("less-plugin-clean-css");
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
    mode: 'development',
    //mode: 'production',
    devtool: "inline-source-map",
    entry: './src/Client/module/IndexPage/index.tsx',
    output: {
        path: path.resolve(__dirname, 'bin/Client'),
        filename: 'index.js'
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"]
    },
    module: {
        rules: [
            { test: /\.tsx?$/, use: 'ts-loader' },
            {
                test: /\.less$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: [
                        { loader: "css-loader", options: { sourceMap: true } },
                        { loader: "less-loader", options: { sourceMap: true, plugins: [new CleanCSSPlugin({ advanced: true })] } }
                    ]
                })
            },
            {
                test: /\.css$/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: [
                        { loader: "css-loader", options: { sourceMap: true } }
                    ]
                })
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin([
            { from: 'src/Client/res/img', to: './res/img' },
            { from: 'src/Client/res/font', to: './res/font' },
        ]),
        new ExtractTextPlugin("index.css"),
        new HtmlWebpackPlugin({ filename: 'index.html', template: 'src/Client/module/IndexPage/index.html' }),
        new MonacoWebpackPlugin()
    ]
};