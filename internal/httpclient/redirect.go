package httpclient

import (
	"fmt"
	"net/http"
	"strings"

	"jiemian/internal/models"
)

func followRedirects(client *http.Client, req *http.Request, maxRedirects int) ([]models.RedirectHop, *http.Response, error) {
	if maxRedirects <= 0 {
		maxRedirects = 10
	}

	var hops []models.RedirectHop

	for i := 0; i < maxRedirects; i++ {
		resp, err := client.Do(req)
		if err != nil {
			return hops, nil, err
		}

		if resp.StatusCode < 300 || resp.StatusCode >= 400 {
			return hops, resp, nil
		}

		location := resp.Header.Get("Location")
		if location == "" {
			return hops, resp, nil
		}

		headers := make(map[string]string)
		for k, v := range resp.Header {
			if len(v) > 0 {
				headers[k] = strings.Join(v, "\n")
			}
		}

		hops = append(hops, models.RedirectHop{
			URL:        req.URL.String(),
			Status:     resp.StatusCode,
			StatusText: resp.Status,
			Headers:    headers,
		})
		resp.Body.Close()

		nextURL, err := req.URL.Parse(location)
		if err != nil {
			return hops, nil, fmt.Errorf("invalid redirect URL: %w", err)
		}

		req, err = http.NewRequestWithContext(req.Context(), "GET", nextURL.String(), nil)
		if err != nil {
			return hops, nil, err
		}
	}

	return hops, nil, fmt.Errorf("too many redirects (max %d)", maxRedirects)
}
