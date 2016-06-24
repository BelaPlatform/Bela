cp ../IDE/public/js/bundle.js ./
babel --presets es2015 bundle.js -o ../IDE/public/js/bundleES5.js
rm ./bundle.js
# babel -o ../IDE/public/scope/js/bundleES5.js ../IDE/public/scope/js/bundle.js
cp ../IDE/public/scope/js/bundle.js ./
babel --presets es2015 bundle.js -o ../IDE/public/scope/js/bundleES5.js
rm ./bundle.js
