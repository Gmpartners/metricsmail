    // Processar evento de cancelamento de inscrição (lead_channel_subscription_changed)
    if (req.body['mautic.lead_channel_subscription_changed']) {
      const subscriptionEvents = Array.isArray(req.body['mautic.lead_channel_subscription_changed']) 
        ? req.body['mautic.lead_channel_subscription_changed'] 
        : [req.body['mautic.lead_channel_subscription_changed']];
      
      for (const event of subscriptionEvents) {
        // Verificar se é um evento de cancelamento de inscrição (unsubscribe)
        if (event.new_status === 'unsubscribed' && event.channel === 'email') {
          const eventResult = await processMauticSubscriptionChangeEvent(account, event);
          if (eventResult) processedEvents.push(eventResult);
        }
      }
    }
