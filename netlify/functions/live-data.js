"use strict";

const { json, handleOptions, withErrorBoundary } = require("../../src/http");
const { buildLiveData } = require("../../src/live-data");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;
  return json(buildLiveData());
});
