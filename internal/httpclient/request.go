package httpclient

import (
	"encoding/base64"
	"io"
	"net/http"
	"net/url"
	"strings"

	"jiemian/internal/models"
)

func buildRequest(config *models.RequestConfig) (*http.Request, error) {
	reqURL, err := buildURL(config)
	if err != nil {
		return nil, err
	}

	body := buildBody(config)

	req, err := http.NewRequest(string(config.Method), reqURL, body)
	if err != nil {
		return nil, err
	}

	applyHeaders(req, config)
	applyCookies(req, config)
	applyAuth(req, config)
	applyContentType(req, config)

	return req, nil
}

func buildURL(config *models.RequestConfig) (string, error) {
	u, err := url.Parse(config.URL)
	if err != nil {
		return "", err
	}
	q := u.Query()
	for _, p := range config.Params {
		if p.Enabled && p.Key != "" {
			q.Add(p.Key, p.Value)
		}
	}
	u.RawQuery = q.Encode()
	return u.String(), nil
}

func buildBody(config *models.RequestConfig) io.Reader {
	switch config.BodyType {
	case "json", "raw":
		if config.Body != "" {
			return strings.NewReader(config.Body)
		}
	case "urlencoded":
		vals := url.Values{}
		for _, fd := range config.FormData {
			if fd.Enabled && fd.Key != "" {
				vals.Set(fd.Key, fd.Value)
			}
		}
		encoded := vals.Encode()
		if encoded != "" {
			return strings.NewReader(encoded)
		}
	// TODO: "form" (multipart/form-data) body type is not yet implemented.
	}
	return nil
}

func applyHeaders(req *http.Request, config *models.RequestConfig) {
	for _, h := range config.Headers {
		if h.Enabled && h.Key != "" {
			req.Header.Set(h.Key, h.Value)
		}
	}
}

func applyCookies(req *http.Request, config *models.RequestConfig) {
	for _, c := range config.Cookies {
		if c.Enabled && c.Key != "" {
			req.AddCookie(&http.Cookie{Name: c.Key, Value: c.Value})
		}
	}
}

func applyAuth(req *http.Request, config *models.RequestConfig) {
	switch config.Auth.Type {
	case "bearer":
		if config.Auth.Bearer != "" {
			req.Header.Set("Authorization", "Bearer "+config.Auth.Bearer)
		}
	case "basic":
		if config.Auth.Basic != nil {
			cred := config.Auth.Basic.Username + ":" + config.Auth.Basic.Password
			encoded := base64.StdEncoding.EncodeToString([]byte(cred))
			req.Header.Set("Authorization", "Basic "+encoded)
		}
	case "apikey":
		if config.Auth.ApiKey != nil {
			switch config.Auth.ApiKey.AddTo {
			case "header":
				req.Header.Set(config.Auth.ApiKey.Key, config.Auth.ApiKey.Value)
			case "query":
				q := req.URL.Query()
				q.Set(config.Auth.ApiKey.Key, config.Auth.ApiKey.Value)
				req.URL.RawQuery = q.Encode()
			}
		}
	}
}

func applyContentType(req *http.Request, config *models.RequestConfig) {
	if req.Header.Get("Content-Type") != "" {
		return
	}
	switch config.BodyType {
	case "json":
		req.Header.Set("Content-Type", "application/json")
	case "urlencoded":
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
}
