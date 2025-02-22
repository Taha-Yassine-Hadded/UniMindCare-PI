**UniMindCare ✨ - Student Well-Being & Psychological Health**

🌐 **About the Project**

UniMindCare is a web application designed to enhance students' well-being and psychological health at ESPRIT University. Our goal is to provide a supportive platform where students can access resources, assessments, and counseling services to improve their mental health.

🚀 **Tech Stack**

- **Backend**: Express.js (Node.js)
- **Frontend**: React.js + Vite
- **Database**: MongoDB
- **Security & User Management**: Keycloak
- **Containerization & CI/CD**: Docker, GitHub Actions
- **Testing**: Jest (Unit Testing), ESLint (Linting)

## 🚀 Getting Started

**Prerequisites**

Make sure you have the following installed:

- Docker Desktop installed & running 🐳
- Node.js & npm
- `.env` file in `/backend` folder (contact team for template) 🔑

🛠️ **Installation & Setup**

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/Taha-Yassine-Hadded/UniMindCare-PI
   cd UniMindCare-PI
   ```

2. **Set Up Environment Variables**:

   Place the .env file inside the backend folder with necessary configurations, including Keycloak credentials for security.

3. **Run the Application in Docker**:

   ```bash
   docker compose up --build
   ```

   This will start both the backend and frontend services.

⚖️ **Development Phase**

We are currently in the development phase, and contributions are welcome! Check out the Issues section to collaborate.

📝 **Features**

- 🏢 **University Well-Being Resources**
- 👥 **Student Psychological Support**
- 🔎 **Mental Health Assessments**
- 💡 **Counseling and Advice Platform

💡 **User Management with Keycloak**

Keycloak is used for secure authentication and user management, ensuring a seamless and protected login experience for students and staff.

💪 **Contributing**

- Fork the repository
- Create a feature branch (`git checkout -b feature-name`)
- Commit your changes (`git commit -m "Added a new feature"`)
- Push to the branch (`git push origin feature-name`)
- Open a Pull Request

⚙️ **Testing**

- Run unit tests using Jest:

   ```bash
   npm test
   ```

- Run Linting:

   ```bash
   npm run lint
   ```

📈 **CI/CD with GitHub Actions**

- Dockerized Testing: Runs in GitHub Actions
- Linting Check: Automated ESLint verification
- Unit Tests: Ensures quality and stability

✨ **Show Your Support**

Give a ⭐ if you like this project and want to see it grow!

🌟 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

Made with ❤️ by the NexGenCoders Team at ESPRIT University
