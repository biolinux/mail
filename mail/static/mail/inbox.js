document.addEventListener('DOMContentLoaded', function() {

  // Function to clear compose form fields
  function clearComposeForm() {
    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';
  }

  // Function to render emails in a mailbox
  function render_emails(mailbox) {
    // Select the container where emails will be displayed
    const emailsView = document.querySelector('#emails-view');
    // Clear previous content
    emailsView.innerHTML = '';

    // Make a GET request to fetch emails for the selected mailbox
    fetch(`/emails/${mailbox}`)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Failed to fetch emails');
        }
      })
      .then(emails => {
        // Loop through each email
        emails.forEach(email => {
          // Create a div element for each email
          const emailDiv = document.createElement('div');
          emailDiv.classList.add('email');
          emailDiv.dataset.emailId = email.id; // Store email ID as a data attribute

          // Set content for the email div
          emailDiv.innerHTML = `
            <strong>Recipients:</strong> ${email.recipients}<br>
            <strong>Subject:</strong> <a href="#" class="subject" data-email-id="${email.id}">${email.subject}</a><br>
            <span class="timestamp">${email.timestamp}</span>
          `;

          // Add archive button for inbox emails
          if (mailbox === 'inbox') {
            const archiveButton = document.createElement('button');
            archiveButton.innerText = 'Archive';
            archiveButton.addEventListener('click', () => {
              toggleArchive(email.id, true); // Archive the email
            });
            emailDiv.appendChild(archiveButton);
          }

          // Add unarchive button for archived emails
          if (mailbox === 'archive') {
            const unarchiveButton = document.createElement('button');
            unarchiveButton.innerText = 'Unarchive';
            unarchiveButton.addEventListener('click', () => {
              toggleArchive(email.id, false); // Unarchive the email
            });
            emailDiv.appendChild(unarchiveButton);
          }

          // Add click event listener to the subject link
          emailDiv.querySelector('.subject').addEventListener('click', function(event) {
            event.preventDefault();
            const emailId = event.target.dataset.emailId;
            view_email(emailId);
          });

          // Append the email div to the container
          emailsView.appendChild(emailDiv);
        });
      })
      .catch(error => {
        console.error('Error fetching emails:', error);
      });
  }

  // Function to load the selected mailbox
  function load_mailbox(mailbox) {
    // Update the title to display the name of the mailbox
    document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
    // Call the function to render emails in the selected mailbox
    render_emails(mailbox);

    // Hide the compose form when navigating to a mailbox view
    document.querySelector('#compose-view').style.display = 'none';
    // Show the emails view
    document.querySelector('#emails-view').style.display = 'block';

    // Clear compose form fields
    clearComposeForm();

    // Fetch and display total count of emails in inbox
    if (mailbox === 'inbox') {
      fetch(`/emails/inbox/count`)
        .then(response => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error('Failed to fetch inbox count');
          }
        })
        .then(data => {
          // Display inbox count to the user
          const inboxCountElement = document.createElement('div');
          inboxCountElement.innerText = `Total emails in inbox: ${data.count}`;
          inboxCountElement.id = 'inbox-count';
          inboxCountElement.style.display = 'block'; // Show the count element
          document.querySelector('#emails-view').prepend(inboxCountElement);
        })
        .catch(error => {
          console.error('Error fetching inbox count:', error);
        });
    } else {
      // If not inbox, hide the count element
      document.querySelector('#inbox-count').style.display = 'none';
    }
  }

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));

  // Show compose form when compose button is clicked
  document.querySelector('#compose').addEventListener('click', function() {
    document.querySelector('#compose-view').style.display = 'block';
    // Hide the emails view
    document.querySelector('#emails-view').style.display = 'none';

    // Clear compose form fields
    clearComposeForm();
  });

  // Hide compose form when the page is loaded
  document.querySelector('#compose-view').style.display = 'none';

  // Select the compose form and attach event listener
  const composeForm = document.querySelector('#compose-form');

  composeForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent default form submission behavior

    // Gather form data
    const recipients = document.querySelector('#compose-recipients').value;
    const subject = document.querySelector('#compose-subject').value;
    const body = document.querySelector('#compose-body').value;

    // Ensure there is at least one recipient
    if (!recipients) {
      console.error('At least one recipient is required.');
      return;
    }

    // Send email
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else if (response.status === 400) {
        return response.json().then(data => {
          throw new Error(data.error);
        });
      } else {
        throw new Error('Failed to send email');
      }
    })
    .then(data => {
      // Email sent successfully, load sent mailbox
      load_mailbox('sent');
    })
    .catch(error => {
      console.error('Error sending email:', error);
    });
  });

  // Function to view email content
function view_email(emailId) {
  // Fetch email details using its ID
  fetch(`/emails/${emailId}`)
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Failed to fetch email details');
      }
    })
    .then(email => {
      // Mark the email as read
      if (!email.read) {
        fetch(`/emails/${emailId}`, {
          method: 'PUT',
          body: JSON.stringify({
            read: true
          })
        })
        .catch(error => {
          console.error('Error marking email as read:', error);
        });
      }

      // Create email content container
      const emailContent = document.createElement('div');
      emailContent.classList.add('email-details');

      // Add email details to the email content
      emailContent.innerHTML = `
        <p><strong>From:</strong> ${email.sender}</p>
        <p><strong>To:</strong> ${email.recipients}</p>
        <p><strong>Subject:</strong> ${email.subject}</p>
        <p><strong>Timestamp:</strong> ${email.timestamp}</p>
        <hr class="gray-line">
        <p class="email-body">${email.body}</p>
      `;

      // Create reply button
      const replyButton = document.createElement('button');
      replyButton.classList.add('btn', 'btn-primary', 'reply-button');
      replyButton.dataset.emailId = email.id;
      replyButton.innerText = 'Reply';
      replyButton.addEventListener('click', function(event) {
        event.preventDefault();
        const emailId = event.target.dataset.emailId;
        reply_to_email(emailId);
      });

      // Append reply button after the timestamp
      const timestampParagraph = emailContent.querySelector('p:nth-child(4)');
      const replyButtonParagraph = document.createElement('p');
      replyButtonParagraph.appendChild(replyButton);
      timestampParagraph.parentNode.insertBefore(replyButtonParagraph, timestampParagraph.nextSibling);

      // Clear previous content and display the email content
      const emailsView = document.querySelector('#emails-view');
      emailsView.innerHTML = '';
      emailsView.appendChild(emailContent);

      // Change background color based on read/unread status
      if (!email.read) {
        emailContent.style.backgroundColor = 'white'; // Unread emails have white background
      } else {
        emailContent.style.backgroundColor = 'lightgray'; // Read emails have gray background
      }
    })
    .catch(error => {
      console.error('Error fetching email details:', error);
    });
}

  // Function to reply to an email
  function reply_to_email(emailId) {
    // Fetch email details using its ID
    fetch(`/emails/${emailId}`)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Failed to fetch email details');
        }
      })
      .then(email => {
        // Pre-fill the body of the email with the necessary information
        const originalText = `On ${email.timestamp} ${email.sender} wrote:\n${email.body}`;
        const preFilledBody = `${originalText}`;

        // Add previous email content to the pre-filled body if available, separated by a line break and separator
        const previousContent = document.querySelector('#compose-body').value;
        const separator = '\n\n---\n\n'; // Separator with line breaks
        const finalBody = previousContent ? `${previousContent}\n${separator}${preFilledBody}` : preFilledBody;

        // Populate the compose form with the recipient, subject, and pre-filled body
        document.querySelector('#compose-recipients').value = email.sender;
        document.querySelector('#compose-subject').value = `Re: ${email.subject}`;
        document.querySelector('#compose-body').value = finalBody;
        
        // Show the compose form
        document.querySelector('#compose-view').style.display = 'block';
        // Hide the emails view
        document.querySelector('#emails-view').style.display = 'none';
      })
      .catch(error => {
        console.error('Error fetching email details:', error);
      });
  }

  // Function to handle archiving or unarchiving emails
  function toggleArchive(emailId, action) {
    fetch(`/emails/${emailId}`, {
        method: 'PUT',
        body: JSON.stringify({
            archived: action // true for archiving, false for unarchiving
        })
    })
    .then(response => {
        if (response.ok) {
            load_mailbox('inbox'); // Reload the inbox after archiving or unarchiving
        } else {
            throw new Error('Failed to toggle archive status');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
  }

  // Load the inbox by default when the page is loaded
  load_mailbox('inbox');

});