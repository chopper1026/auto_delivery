-- +goose Up
UPDATE system_settings
SET value = E'卡密：{{cardKey}}\n兑换地址：{{redeemUrl}}\n创建时间：{{createdAt}}\n过期时间：{{expiresAt}}\n\n注意事项：卡密仅可兑换一次，请在有效期内及时兑换，兑换后立刻保存，过期或自身未保存导致的损失自负。',
    updated_at = now()
WHERE key = 'card_key_delivery_message_template'
  AND value = E'兑换地址：{{redeemUrl}}\n卡密：{{cardKey}}\n创建时间：{{createdAt}}\n到期时间：{{expiresAt}}\n\n注意事项：\n1. 一个卡密只能兑换一次，请勿转发给无关人员。\n2. 兑换完成后请及时保存收货页面内容或下载文件。\n3. 因个人原因未及时保存导致的损失不予处理。';

-- +goose Down
UPDATE system_settings
SET value = E'兑换地址：{{redeemUrl}}\n卡密：{{cardKey}}\n创建时间：{{createdAt}}\n到期时间：{{expiresAt}}\n\n注意事项：\n1. 一个卡密只能兑换一次，请勿转发给无关人员。\n2. 兑换完成后请及时保存收货页面内容或下载文件。\n3. 因个人原因未及时保存导致的损失不予处理。',
    updated_at = now()
WHERE key = 'card_key_delivery_message_template'
  AND value = E'卡密：{{cardKey}}\n兑换地址：{{redeemUrl}}\n创建时间：{{createdAt}}\n过期时间：{{expiresAt}}\n\n注意事项：卡密仅可兑换一次，请在有效期内及时兑换，兑换后立刻保存，过期或自身未保存导致的损失自负。';
