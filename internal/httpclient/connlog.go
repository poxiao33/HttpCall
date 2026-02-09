package httpclient

import (
	"net"
	"sort"
	"sync"
	"time"
)

type connEntry struct {
	elapsed   time.Duration
	direction string // "send" / "recv"
	data      []byte
}

type loggedConn struct {
	net.Conn
	mu      sync.Mutex
	start   time.Time
	entries []connEntry
}

func newLoggedConn(conn net.Conn) *loggedConn {
	return &loggedConn{
		Conn:  conn,
		start: time.Now(),
	}
}

func (c *loggedConn) Read(b []byte) (int, error) {
	n, err := c.Conn.Read(b)
	if n > 0 {
		c.mu.Lock()
		c.entries = append(c.entries, connEntry{
			elapsed:   time.Since(c.start),
			direction: "recv",
			data:      append([]byte(nil), b[:n]...),
		})
		c.mu.Unlock()
	}
	return n, err
}

func (c *loggedConn) Write(b []byte) (int, error) {
	n, err := c.Conn.Write(b)
	if n > 0 {
		c.mu.Lock()
		c.entries = append(c.entries, connEntry{
			elapsed:   time.Since(c.start),
			direction: "send",
			data:      append([]byte(nil), b[:n]...),
		})
		c.mu.Unlock()
	}
	return n, err
}

func (c *loggedConn) getEntries() []connEntry {
	c.mu.Lock()
	defer c.mu.Unlock()
	out := make([]connEntry, len(c.entries))
	copy(out, c.entries)
	return out
}

// mergeConnEntries merges entries from multiple loggedConns into a single
// timeline, adjusting elapsed times relative to the first conn's start.
func mergeConnEntries(conns []*loggedConn) []connEntry {
	if len(conns) == 0 {
		return nil
	}
	base := conns[0].start
	var merged []connEntry
	for _, conn := range conns {
		offset := conn.start.Sub(base)
		for _, e := range conn.getEntries() {
			merged = append(merged, connEntry{
				elapsed:   e.elapsed + offset,
				direction: e.direction,
				data:      e.data,
			})
		}
	}
	sort.Slice(merged, func(i, j int) bool {
		return merged[i].elapsed < merged[j].elapsed
	})
	return merged
}
