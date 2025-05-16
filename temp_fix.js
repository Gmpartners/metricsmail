        const eventFilter = {
          userId,
          emailId: email._id.toString(), // Usa emailId em vez de email
          timestamp: { $gte: start, $lte: end }
        };
