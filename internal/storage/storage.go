package storage

import (
	"os"
	"path/filepath"
)

// Storage provides simple file-based storage for JSON data
type Storage struct {
	dir string
}

// New creates a new Storage instance using the user's config directory
func New() (*Storage, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}

	baseDir := filepath.Join(configDir, "jiemian")
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, err
	}

	return &Storage{dir: baseDir}, nil
}

// ReadFile reads a file from the storage directory
func (s *Storage) ReadFile(name string) ([]byte, error) {
	path := filepath.Join(s.dir, name)
	return os.ReadFile(path)
}

// WriteFile writes data to a file in the storage directory
func (s *Storage) WriteFile(name string, data []byte) error {
	path := filepath.Join(s.dir, name)
	return os.WriteFile(path, data, 0644)
}
