module.exports = api => {
  api.cache.using(() => process.env.COVERAGE);
  return {
    presets: [
      [
        "@babel/preset-env",
        {
          targets: {
            firefox: 57
          }
        }
      ],
      "@babel/preset-react"
    ],
    plugins: [
      "@babel/plugin-proposal-optional-chaining",
      "@babel/plugin-proposal-object-rest-spread",
      "@babel/plugin-transform-class-properties",
      // MV3 CSP forbids `new Function()`; tell babel-plugin-istanbul to attach
      // coverage to `self` directly (defined in both pages and service workers)
      // instead of detecting global via Function.
      ...(process.env.COVERAGE === "1"
        ? [
            [
              "istanbul",
              { coverageGlobalScope: "self", coverageGlobalScopeFunc: false }
            ]
          ]
        : [])
    ]
  };
};
