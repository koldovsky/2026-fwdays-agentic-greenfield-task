// Package linkgen builds send.monobank.ua jar top-up links from matched
// plan entries.
package linkgen

import (
	"fmt"

	"md/agentic/monojar/internal/jarmatching"
)

const jarLinkBaseURL = "https://send.monobank.ua/jar/"

// Link is a matched plan entry rendered as a ready-to-click jar top-up
// link.
type Link struct {
	Name   string
	Amount int
	URL    string
}

// GenerateLinks builds one Link per matched entry, in the same order as
// matched.
func GenerateLinks(matched []jarmatching.Matched) []Link {
	links := make([]Link, len(matched))
	for i, m := range matched {
		links[i] = Link{
			Name:   m.Name,
			Amount: m.Amount,
			URL:    buildURL(m.SendID, m.Amount),
		}
	}
	return links
}

// buildURL renders the jar top-up link for sendID and amount. amount is
// UAH, applied 1:1 with no conversion.
func buildURL(sendID string, amount int) string {
	return fmt.Sprintf("%s%s?a=%d", jarLinkBaseURL, sendID, amount)
}
