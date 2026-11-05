import globals from 'globals';
export default [{ignores:['dist/**','node_modules/**']},{files:['src/**/*.{js,jsx}'],languageOptions:{ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},globals:globals.browser},rules:{'no-undef':'error','no-unreachable':'error','no-dupe-keys':'error'}}];
