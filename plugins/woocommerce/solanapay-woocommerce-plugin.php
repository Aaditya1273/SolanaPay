<?php
/**
 * Plugin Name: SolanaPay for WooCommerce
 * Plugin URI: https://solanapay.com/woocommerce
 * Description: Accept Solana payments in your WooCommerce store with instant settlements and low fees.
 * Version: 1.0.0
 * Author: SolanaPay
 * Author URI: https://solanapay.com
 * License: GPL v2 or later
 * Text Domain: solanapay-woocommerce
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.3
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('SOLANAPAY_WC_VERSION', '1.0.0');
define('SOLANAPAY_WC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SOLANAPAY_WC_PLUGIN_PATH', plugin_dir_path(__FILE__));

// Check if WooCommerce is active
add_action('plugins_loaded', 'solanapay_wc_init');

function solanapay_wc_init() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', 'solanapay_wc_missing_woocommerce_notice');
        return;
    }

    // Initialize the payment gateway
    add_filter('woocommerce_payment_gateways', 'solanapay_wc_add_gateway_class');
    
    // Add settings link
    add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'solanapay_wc_add_settings_link');
}

function solanapay_wc_missing_woocommerce_notice() {
    echo '<div class="error"><p><strong>' . __('SolanaPay for WooCommerce', 'solanapay-woocommerce') . '</strong>: ' . __('WooCommerce is required for this plugin to work.', 'solanapay-woocommerce') . '</p></div>';
}

function solanapay_wc_add_gateway_class($gateways) {
    $gateways[] = 'WC_SolanaPay_Gateway';
    return $gateways;
}

function solanapay_wc_add_settings_link($links) {
    $settings_link = '<a href="admin.php?page=wc-settings&tab=checkout&section=solanapay">' . __('Settings', 'solanapay-woocommerce') . '</a>';
    array_unshift($links, $settings_link);
    return $links;
}

// Main Gateway Class
class WC_SolanaPay_Gateway extends WC_Payment_Gateway {
    
    public function __construct() {
        $this->id = 'solanapay';
        $this->icon = SOLANAPAY_WC_PLUGIN_URL . 'assets/solana-icon.png';
        $this->has_fields = false;
        $this->method_title = __('SolanaPay', 'solanapay-woocommerce');
        $this->method_description = __('Accept Solana payments with instant settlements and low fees.', 'solanapay-woocommerce');
        $this->supports = array(
            'products',
            'refunds'
        );

        // Load settings
        $this->init_form_fields();
        $this->init_settings();

        // Define user set variables
        $this->title = $this->get_option('title');
        $this->description = $this->get_option('description');
        $this->enabled = $this->get_option('enabled');
        $this->testmode = 'yes' === $this->get_option('testmode');
        $this->api_key = $this->testmode ? $this->get_option('test_api_key') : $this->get_option('live_api_key');
        $this->api_secret = $this->testmode ? $this->get_option('test_api_secret') : $this->get_option('live_api_secret');
        $this->webhook_secret = $this->get_option('webhook_secret');
        $this->base_url = $this->testmode ? 'https://api-dev.solanapay.com' : 'https://api.solanapay.com';

        // Actions
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        add_action('woocommerce_api_wc_solanapay_gateway', array($this, 'webhook'));
        add_action('wp_enqueue_scripts', array($this, 'payment_scripts'));
    }

    /**
     * Initialize Gateway Settings Form Fields
     */
    public function init_form_fields() {
        $this->form_fields = array(
            'enabled' => array(
                'title'   => __('Enable/Disable', 'solanapay-woocommerce'),
                'type'    => 'checkbox',
                'label'   => __('Enable SolanaPay Payment', 'solanapay-woocommerce'),
                'default' => 'yes'
            ),
            'title' => array(
                'title'       => __('Title', 'solanapay-woocommerce'),
                'type'        => 'text',
                'description' => __('This controls the title for the payment method the customer sees during checkout.', 'solanapay-woocommerce'),
                'default'     => __('Solana Payment', 'solanapay-woocommerce'),
                'desc_tip'    => true,
            ),
            'description' => array(
                'title'       => __('Description', 'solanapay-woocommerce'),
                'type'        => 'textarea',
                'description' => __('Payment method description that the customer will see on your checkout.', 'solanapay-woocommerce'),
                'default'     => __('Pay with SOL or USDC using your Solana wallet. Fast, secure, and low fees.', 'solanapay-woocommerce'),
                'desc_tip'    => true,
            ),
            'testmode' => array(
                'title'       => __('Test mode', 'solanapay-woocommerce'),
                'label'       => __('Enable Test Mode', 'solanapay-woocommerce'),
                'type'        => 'checkbox',
                'description' => __('Place the payment gateway in test mode using test API keys.', 'solanapay-woocommerce'),
                'default'     => 'yes',
                'desc_tip'    => true,
            ),
            'test_api_key' => array(
                'title'       => __('Test API Key', 'solanapay-woocommerce'),
                'type'        => 'text',
                'description' => __('Get your API keys from your SolanaPay merchant dashboard.', 'solanapay-woocommerce'),
                'default'     => '',
                'desc_tip'    => true,
            ),
            'test_api_secret' => array(
                'title'       => __('Test API Secret', 'solanapay-woocommerce'),
                'type'        => 'password',
                'description' => __('Get your API keys from your SolanaPay merchant dashboard.', 'solanapay-woocommerce'),
                'default'     => '',
                'desc_tip'    => true,
            ),
            'live_api_key' => array(
                'title'       => __('Live API Key', 'solanapay-woocommerce'),
                'type'        => 'text',
                'description' => __('Get your API keys from your SolanaPay merchant dashboard.', 'solanapay-woocommerce'),
                'default'     => '',
                'desc_tip'    => true,
            ),
            'live_api_secret' => array(
                'title'       => __('Live API Secret', 'solanapay-woocommerce'),
                'type'        => 'password',
                'description' => __('Get your API keys from your SolanaPay merchant dashboard.', 'solanapay-woocommerce'),
                'default'     => '',
                'desc_tip'    => true,
            ),
            'webhook_secret' => array(
                'title'       => __('Webhook Secret', 'solanapay-woocommerce'),
                'type'        => 'password',
                'description' => __('Webhook secret for payment notifications. Set webhook URL to: ' . home_url('/wc-api/wc_solanapay_gateway/'), 'solanapay-woocommerce'),
                'default'     => '',
                'desc_tip'    => true,
            ),
        );
    }

    /**
     * Payment form on checkout page
     */
    public function payment_fields() {
        if ($this->description) {
            echo wpautop(wp_kses_post($this->description));
        }
        
        echo '<div id="solanapay-payment-data">';
        echo '<p>' . __('You will be redirected to complete your payment with Solana.', 'solanapay-woocommerce') . '</p>';
        echo '</div>';
    }

    /**
     * Load payment scripts
     */
    public function payment_scripts() {
        if (!is_admin() && !is_cart() && !is_checkout() && !isset($_GET['pay_for_order'])) {
            return;
        }

        if ('no' === $this->enabled) {
            return;
        }

        if (empty($this->api_key)) {
            return;
        }

        wp_enqueue_script('solanapay_wc_js', SOLANAPAY_WC_PLUGIN_URL . 'assets/solanapay.js', array('jquery'), SOLANAPAY_WC_VERSION, true);
        
        wp_localize_script('solanapay_wc_js', 'solanapay_params', array(
            'api_key' => $this->api_key,
            'testmode' => $this->testmode,
            'base_url' => $this->base_url
        ));
    }

    /**
     * Validate payment fields
     */
    public function validate_fields() {
        if (empty($this->api_key)) {
            wc_add_notice(__('Payment error: API key not configured.', 'solanapay-woocommerce'), 'error');
            return false;
        }
        return true;
    }

    /**
     * Process the payment
     */
    public function process_payment($order_id) {
        $order = wc_get_order($order_id);

        try {
            // Create payment intent
            $payment_intent = $this->create_payment_intent($order);
            
            if (!$payment_intent || !$payment_intent['success']) {
                throw new Exception(__('Unable to create payment intent.', 'solanapay-woocommerce'));
            }

            // Store payment intent ID in order meta
            $order->update_meta_data('_solanapay_payment_intent_id', $payment_intent['paymentIntent']['id']);
            $order->update_meta_data('_solanapay_payment_url', $payment_intent['paymentUrl']);
            $order->save();

            // Mark as pending payment
            $order->update_status('pending', __('Awaiting Solana payment.', 'solanapay-woocommerce'));

            // Reduce stock levels
            wc_reduce_stock_levels($order_id);

            // Remove cart
            WC()->cart->empty_cart();

            // Return success and redirect to payment URL
            return array(
                'result'   => 'success',
                'redirect' => $payment_intent['paymentUrl']
            );

        } catch (Exception $e) {
            wc_add_notice($e->getMessage(), 'error');
            return array(
                'result' => 'failure'
            );
        }
    }

    /**
     * Create payment intent via SolanaPay API
     */
    private function create_payment_intent($order) {
        $currency = $this->get_currency_for_solana($order->get_currency());
        
        $payment_data = array(
            'amount' => floatval($order->get_total()),
            'currency' => $currency,
            'description' => sprintf(__('Order #%s from %s', 'solanapay-woocommerce'), $order->get_order_number(), get_bloginfo('name')),
            'customerEmail' => $order->get_billing_email(),
            'metadata' => json_encode(array(
                'woocommerce_order_id' => $order->get_id(),
                'order_number' => $order->get_order_number(),
                'site_url' => home_url(),
                'customer_id' => $order->get_customer_id(),
                'billing_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'items' => $this->get_order_items($order)
            ))
        );

        $response = $this->api_request('/api/merchant/payment/create', 'POST', $payment_data);
        
        return $response;
    }

    /**
     * Get order items for metadata
     */
    private function get_order_items($order) {
        $items = array();
        foreach ($order->get_items() as $item) {
            $items[] = array(
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'price' => $item->get_total()
            );
        }
        return $items;
    }

    /**
     * Convert WooCommerce currency to Solana supported currency
     */
    private function get_currency_for_solana($wc_currency) {
        $currency_map = array(
            'USD' => 'USDC',
            'EUR' => 'USDC',
            'GBP' => 'USDC'
        );
        
        return isset($currency_map[$wc_currency]) ? $currency_map[$wc_currency] : 'SOL';
    }

    /**
     * Handle webhook
     */
    public function webhook() {
        $payload = @file_get_contents('php://input');
        $sig_header = $_SERVER['HTTP_X_SOLANAPAY_SIGNATURE'] ?? '';

        if (!$this->verify_webhook_signature($payload, $sig_header)) {
            status_header(400);
            exit('Invalid signature');
        }

        $data = json_decode($payload, true);
        
        if (!$data) {
            status_header(400);
            exit('Invalid payload');
        }

        $event = $data['event'] ?? '';
        $payment_data = $data['data'] ?? array();

        switch ($event) {
            case 'payment.completed':
                $this->handle_payment_completed($payment_data);
                break;
            case 'payment.failed':
                $this->handle_payment_failed($payment_data);
                break;
            default:
                error_log('SolanaPay: Unhandled webhook event: ' . $event);
        }

        status_header(200);
        exit('OK');
    }

    /**
     * Handle successful payment
     */
    private function handle_payment_completed($payment_data) {
        $metadata = json_decode($payment_data['metadata'] ?? '{}', true);
        $order_id = $metadata['woocommerce_order_id'] ?? null;

        if (!$order_id) {
            error_log('SolanaPay: Missing order ID in payment metadata');
            return;
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            error_log('SolanaPay: Order not found: ' . $order_id);
            return;
        }

        // Check if already processed
        if ($order->is_paid()) {
            return;
        }

        // Update order
        $order->update_meta_data('_solanapay_transaction_hash', $payment_data['transactionHash'] ?? '');
        $order->update_meta_data('_solanapay_completed_at', $payment_data['completedAt'] ?? '');
        $order->payment_complete($payment_data['transactionHash'] ?? '');
        
        $order->add_order_note(
            sprintf(
                __('Payment completed via SolanaPay. Transaction Hash: %s', 'solanapay-woocommerce'),
                $payment_data['transactionHash'] ?? 'N/A'
            )
        );

        // Issue loyalty points if customer email exists
        if (!empty($payment_data['customerEmail'])) {
            $this->issue_loyalty_points($payment_data['customerEmail'], $payment_data['amount']);
        }

        // Log transaction for analytics
        $this->log_transaction($payment_data, $metadata);
    }

    /**
     * Handle failed payment
     */
    private function handle_payment_failed($payment_data) {
        $metadata = json_decode($payment_data['metadata'] ?? '{}', true);
        $order_id = $metadata['woocommerce_order_id'] ?? null;

        if (!$order_id) {
            return;
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        $order->update_status('failed', __('Solana payment failed.', 'solanapay-woocommerce'));
        $order->add_order_note(__('Payment failed via SolanaPay.', 'solanapay-woocommerce'));
    }

    /**
     * Issue loyalty points
     */
    private function issue_loyalty_points($customer_email, $amount) {
        $points = floor($amount); // 1 point per dollar spent
        
        if ($points > 0) {
            $this->api_request('/api/merchant/loyalty/create', 'POST', array(
                'customerEmail' => $customer_email,
                'points' => $points,
                'reason' => 'WooCommerce purchase reward'
            ));
        }
    }

    /**
     * Log transaction for analytics
     */
    private function log_transaction($payment_data, $metadata) {
        $this->api_request('/api/merchant/analytics/transaction', 'POST', array(
            'amount' => $payment_data['amount'],
            'currency' => $payment_data['currency'],
            'customer_id' => $payment_data['customerEmail'] ?? null,
            'transaction_hash' => $payment_data['transactionHash'] ?? '',
            'metadata' => json_encode(array_merge($metadata, array(
                'source' => 'woocommerce',
                'plugin_version' => SOLANAPAY_WC_VERSION
            )))
        ));
    }

    /**
     * Process refund
     */
    public function process_refund($order_id, $amount = null, $reason = '') {
        $order = wc_get_order($order_id);
        
        if (!$order) {
            return false;
        }

        $payment_intent_id = $order->get_meta('_solanapay_payment_intent_id');
        
        if (!$payment_intent_id) {
            return new WP_Error('solanapay_refund_error', __('Payment intent ID not found.', 'solanapay-woocommerce'));
        }

        // Note: Actual refund implementation would depend on SolanaPay's refund API
        // For now, we'll just add a note to the order
        $order->add_order_note(
            sprintf(
                __('Refund requested: %s. Reason: %s. Manual processing required.', 'solanapay-woocommerce'),
                wc_price($amount),
                $reason
            )
        );

        return true;
    }

    /**
     * Make API request to SolanaPay
     */
    private function api_request($endpoint, $method = 'GET', $data = null) {
        $url = $this->base_url . $endpoint;
        
        $args = array(
            'method' => $method,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->api_key,
                'User-Agent' => 'SolanaPay-WooCommerce/' . SOLANAPAY_WC_VERSION
            ),
            'timeout' => 30
        );

        if ($data && in_array($method, array('POST', 'PUT'))) {
            $args['body'] = json_encode($data);
        }

        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            error_log('SolanaPay API Error: ' . $response->get_error_message());
            return false;
        }

        $body = wp_remote_retrieve_body($response);
        return json_decode($body, true);
    }

    /**
     * Verify webhook signature
     */
    private function verify_webhook_signature($payload, $signature) {
        if (empty($this->webhook_secret) || empty($signature)) {
            return false;
        }

        $expected_signature = hash_hmac('sha256', $payload, $this->webhook_secret);
        return hash_equals($expected_signature, $signature);
    }
}

// Add admin menu for analytics
add_action('admin_menu', 'solanapay_wc_add_admin_menu');

function solanapay_wc_add_admin_menu() {
    add_submenu_page(
        'woocommerce',
        __('SolanaPay Analytics', 'solanapay-woocommerce'),
        __('SolanaPay Analytics', 'solanapay-woocommerce'),
        'manage_woocommerce',
        'solanapay-analytics',
        'solanapay_wc_analytics_page'
    );
}

function solanapay_wc_analytics_page() {
    $gateway = new WC_SolanaPay_Gateway();
    
    if (empty($gateway->api_key)) {
        echo '<div class="notice notice-error"><p>' . __('Please configure your SolanaPay API key first.', 'solanapay-woocommerce') . '</p></div>';
        return;
    }

    // Fetch analytics data
    $analytics = $gateway->api_request('/api/merchant/analytics?period=30d', 'GET');
    
    ?>
    <div class="wrap">
        <h1><?php _e('SolanaPay Analytics', 'solanapay-woocommerce'); ?></h1>
        
        <?php if ($analytics && $analytics['success']): ?>
            <div class="solanapay-analytics-dashboard">
                <div class="solanapay-stats-grid">
                    <div class="solanapay-stat-card">
                        <h3><?php _e('Total Revenue', 'solanapay-woocommerce'); ?></h3>
                        <p class="stat-value"><?php echo number_format($analytics['analytics']['totalRevenue'], 2); ?> SOL</p>
                    </div>
                    <div class="solanapay-stat-card">
                        <h3><?php _e('Total Transactions', 'solanapay-woocommerce'); ?></h3>
                        <p class="stat-value"><?php echo number_format($analytics['analytics']['totalTransactions']); ?></p>
                    </div>
                    <div class="solanapay-stat-card">
                        <h3><?php _e('Success Rate', 'solanapay-woocommerce'); ?></h3>
                        <p class="stat-value"><?php echo $analytics['analytics']['successRate']; ?>%</p>
                    </div>
                </div>
            </div>
        <?php else: ?>
            <p><?php _e('Unable to fetch analytics data.', 'solanapay-woocommerce'); ?></p>
        <?php endif; ?>
    </div>
    
    <style>
        .solanapay-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .solanapay-stat-card {
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .solanapay-stat-card h3 {
            margin: 0 0 10px 0;
            color: #666;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #9945FF;
            margin: 0;
        }
    </style>
    <?php
}

// Installation and activation hooks
register_activation_hook(__FILE__, 'solanapay_wc_activate');
register_deactivation_hook(__FILE__, 'solanapay_wc_deactivate');

function solanapay_wc_activate() {
    // Create necessary database tables or options
    add_option('solanapay_wc_version', SOLANAPAY_WC_VERSION);
}

function solanapay_wc_deactivate() {
    // Cleanup if needed
}

// Load plugin textdomain
add_action('plugins_loaded', 'solanapay_wc_load_textdomain');

function solanapay_wc_load_textdomain() {
    load_plugin_textdomain('solanapay-woocommerce', false, dirname(plugin_basename(__FILE__)) . '/languages/');
}
?>
