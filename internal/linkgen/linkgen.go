// Package linkgen builds send.monobank.ua jar top-up links from matched
// plan entries.
package linkgen

import (
	"fmt"
	"strings"

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
//
// monobank's client-info API returns sendId already prefixed with "jar/"
// (e.g. "jar/5x3KgGN3es"), so any such prefix is trimmed before it is
// rejoined onto jarLinkBaseURL to avoid a doubled "jar/jar/" path.
func buildURL(sendID string, amount int) string {
	sendID = strings.TrimPrefix(sendID, "jar/")
	return fmt.Sprintf("%s%s?a=%d", jarLinkBaseURL, sendID, amount)
}
