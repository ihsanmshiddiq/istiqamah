// Entry point referenced by index.html.
// Static import avoids Rollup circular-chunk TDZ bugs ("Cannot access 'x'
// before initialization") that occur when the entry point is dynamically
// imported and lazy-loaded page chunks depend on the same vendor modules.
import "./__main";
