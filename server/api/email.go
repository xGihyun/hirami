package api

import (
	"encoding/base64"
	"fmt"
	"net/smtp"

	"google.golang.org/api/gmail/v1"
)

func SendEmail(to, subject, body string) error {
	from := "noreply@hirami.test"
	// NOTE: Use the container name as the port for now
	smtpHost := "hirami-mailpit"
	smtpPort := "1025"

	message := fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n"+
			"%s\r\n",
		from, to, subject, body,
	)

	if err := smtp.SendMail(
		smtpHost+":"+smtpPort,
		nil, // No auth for Mailpit
		from,
		[]string{to},
		[]byte(message),
	); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

func SendGmail(svc *gmail.Service, to, subject, body string) error {
	// Compose the raw RFC 2822 message
	raw := fmt.Sprintf(
		"From: noreply@yourdomain.com\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n"+
			"%s\r\n",
		to, subject, body,
	)

	// Gmail API requires base64url encoding
	encoded := base64.URLEncoding.EncodeToString([]byte(raw))

	msg := &gmail.Message{Raw: encoded}

	if _, err := svc.Users.Messages.Send("me", msg).Do(); err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
