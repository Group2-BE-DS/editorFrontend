// tailwind.config.js
module.exports = {
    content: [
        './src/**/*.html',
        "./node_modules/flowbite/**/*.js"
    ],
    theme: {
      extend: {}, // Extend or customize your theme if needed
    },
    plugins: [
        require('flowbite/plugin')

    ], // Add DaisyUI plugin
  };
  