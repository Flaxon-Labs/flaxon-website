 Flaxon Benchmarks

This directory contains performance benchmarks for the Flaxon framework.

## Running Benchmarks

```bash
# Run all benchmarks
python -m benchmarks.routing_benchmark
python -m benchmarks.json_benchmark
python -m benchmarks.middleware_benchmark
python -m benchmarks.websocket_benchmark
python -m benchmarks.template_benchmark

# Or use the Makefile
make benchmark
Benchmark Results
Results are stored in the results/ directory as JSON files.

Benchmark Descriptions
routing_benchmark.py
Tests the performance of route registration, matching, and URL generation.

json_benchmark.py
Tests JSON serialization and deserialization performance.

middleware_benchmark.py
Tests the overhead of middleware stacks.

websocket_benchmark.py
Tests WebSocket connection and message throughput.

template_benchmark.py
Tests Jinax template rendering performance.

Interpreting Results
Requests per second (RPS): Higher is better

Latency (ms): Lower is better

Memory usage (MB): Lower is better

Environment
All benchmarks should be run on the same hardware for consistent results.