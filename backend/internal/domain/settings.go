package domain

type Settings struct {
	ServiceBaseURL          string `json:"serviceBaseUrl"`
	DeliveryMessageTemplate string `json:"deliveryMessageTemplate"`
}

type SettingsUpdate struct {
	ServiceBaseURL          *string
	DeliveryMessageTemplate *string
}
