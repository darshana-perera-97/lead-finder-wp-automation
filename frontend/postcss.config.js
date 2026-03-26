const tailwindPkg = require('tailwindcss/package.json');
const tailwindMajor = Number(String(tailwindPkg.version).split('.')[0]);

const tailwindPlugin = tailwindMajor >= 4 ? require('@tailwindcss/postcss') : require('tailwindcss');

module.exports = {
  plugins: [tailwindPlugin, require('autoprefixer')],
};

