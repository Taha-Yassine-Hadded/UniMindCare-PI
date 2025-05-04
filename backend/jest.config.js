module.exports = {
    testEnvironment: "node",
    moduleDirectories: ["node_modules", "Models", "routes"],
    moduleFileExtensions: ["js", "json"],
    coveragePathIgnorePatterns: ["/test/"],
    reporters: [
      "default",
      ["jest-junit", {
        outputDirectory: ".",
        outputName: "junit.xml"
      }]
    ]
  };