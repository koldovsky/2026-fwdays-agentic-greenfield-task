// Command jarsplit reads a plan of fixed jar amounts, resolves each jar
// name against the user's monobank jars, and prints ready-to-click
// send.monobank.ua top-up links with a total.
package main

import (
	"os"

	"md/agentic/monojar/internal/monoclient"
)

func main() {
	os.Exit(run(os.Args[1:], os.Stdout, os.Stderr, monoclient.NewJarFetcher()))
}
