package httpclient

import (
	"net/http/httptrace"
	"sync"
	"time"

	"jiemian/internal/models"
)

type timingTracker struct {
	mu           sync.Mutex
	connectStart time.Time
	connectDone  time.Time
	tlsStart     time.Time
	tlsDone      time.Time
	gotFirstByte time.Time
	requestStart time.Time
	bodyDone     time.Time
}

func newTimingTracker() *timingTracker {
	return &timingTracker{}
}

// Manual setters for use in dialTLS where httptrace hooks don't fire
func (t *timingTracker) setTCP(start, done time.Time) {
	t.mu.Lock()
	t.connectStart = start
	t.connectDone = done
	t.mu.Unlock()
}

func (t *timingTracker) setTLS(start, done time.Time) {
	t.mu.Lock()
	t.tlsStart = start
	t.tlsDone = done
	t.mu.Unlock()
}

// trace returns httptrace hooks — only GotFirstResponseByte fires reliably
func (t *timingTracker) trace() *httptrace.ClientTrace {
	return &httptrace.ClientTrace{
		GotFirstResponseByte: func() {
			t.mu.Lock()
			t.gotFirstByte = time.Now()
			t.mu.Unlock()
		},
	}
}

func (t *timingTracker) result() models.TimingData {
	t.mu.Lock()
	defer t.mu.Unlock()

	var td models.TimingData
	if !t.connectStart.IsZero() && !t.connectDone.IsZero() {
		td.TCP = t.connectDone.Sub(t.connectStart).Milliseconds()
	}
	if !t.tlsStart.IsZero() && !t.tlsDone.IsZero() {
		td.TLS = t.tlsDone.Sub(t.tlsStart).Milliseconds()
	}
	if !t.requestStart.IsZero() && !t.gotFirstByte.IsZero() {
		td.TTFB = t.gotFirstByte.Sub(t.requestStart).Milliseconds()
	}
	if !t.gotFirstByte.IsZero() && !t.bodyDone.IsZero() {
		td.Download = t.bodyDone.Sub(t.gotFirstByte).Milliseconds()
	}
	if !t.requestStart.IsZero() && !t.bodyDone.IsZero() {
		td.Total = t.bodyDone.Sub(t.requestStart).Milliseconds()
	}
	return td
}
