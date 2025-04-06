import java.io.*;
import java.net.*;
import java.util.*;
import org.json.*;

public class VipSystemServer {
    private static final int PORT = 8080;
    private static final String DATA_FILE = "vip_system_data.json";
    
    private static JSONObject systemData;
    
    public static void main(String[] args) {
        loadData();
        
        try (ServerSocket serverSocket = new ServerSocket(PORT)) {
            System.out.println("VIP系统服务器已启动，监听端口: " + PORT);
            
            while (true) {
                Socket clientSocket = serverSocket.accept();
                new Thread(() -> handleClient(clientSocket)).start();
            }
        } catch (IOException e) {
            System.err.println("服务器启动失败: " + e.getMessage());
        }
    }
    
    private static void handleClient(Socket clientSocket) {
        try (BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
             PrintWriter out = new PrintWriter(clientSocket.getOutputStream(), true)) {
            
            StringBuilder requestBuilder = new StringBuilder();
            String line;
            while ((line = in.readLine()) != null && !line.isEmpty()) {
                requestBuilder.append(line).append("\n");
            }
            
            String request = requestBuilder.toString().trim();
            System.out.println("收到请求: " + request);
            
            String response = processRequest(request);
            out.println(response);
            
        } catch (IOException e) {
            System.err.println("客户端处理错误: " + e.getMessage());
        } finally {
            try {
                clientSocket.close();
            } catch (IOException e) {
                System.err.println("关闭客户端连接错误: " + e.getMessage());
            }
        }
    }
    
    private static String processRequest(String request) {
        try {
            JSONObject requestJson = new JSONObject(request);
            String action = requestJson.getString("action");
            
            switch (action) {
                case "sync":
                    return handleSync(requestJson);
                case "login":
                    return handleLogin(requestJson);
                case "register":
                    return handleRegister(requestJson);
                case "get_data":
                    return handleGetData(requestJson);
                default:
                    return createErrorResponse("未知操作");
            }
        } catch (JSONException e) {
            return createErrorResponse("无效的请求格式");
        }
    }
    
    private static String handleSync(JSONObject request) {
        try {
            JSONObject data = request.getJSONObject("data");
            
            systemData = data;
            saveData();
            
            return createSuccessResponse("同步成功");
        } catch (JSONException e) {
            return createErrorResponse("无效的同步数据");
        }
    }
    
    private static String handleLogin(JSONObject request) {
        try {
            String username = request.getString("username");
            String password = request.getString("password");
            
            if (!systemData.getJSONObject("users").has(username)) {
                return createErrorResponse("用户不存在");
            }
            
            JSONObject user = systemData.getJSONObject("users").getJSONObject(username);
            if (!user.getString("password").equals(password)) {
                return createErrorResponse("密码错误");
            }
            
            JSONObject response = new JSONObject();
            response.put("status", "success");
            response.put("message", "登录成功");
            response.put("user", user);
            
            return response.toString();
        } catch (JSONException e) {
            return createErrorResponse("无效的登录数据");
        }
    }
    
    private static String handleRegister(JSONObject request) {
        try {
            String username = request.getString("username");
            String password = request.getString("password");
            String email = request.getString("email");
            
            if (systemData.getJSONObject("users").has(username)) {
                return createErrorResponse("用户名已存在");
            }
            
            JSONObject newUser = new JSONObject();
            newUser.put("password", password);
            newUser.put("email", email);
            newUser.put("points", 0);
            newUser.put("vipLevel", 0);
            newUser.put("lastCheckIn", JSONObject.NULL);
            
            systemData.getJSONObject("users").put(username, newUser);
            saveData();
            
            return createSuccessResponse("注册成功");
        } catch (JSONException e) {
            return createErrorResponse("无效的注册数据");
        }
    }
    
    private static String handleGetData(JSONObject request) {
        try {
            String dataType = request.getString("data_type");
            
            JSONObject response = new JSONObject();
            response.put("status", "success");
            
            switch (dataType) {
                case "announcements":
                    response.put("data", systemData.getJSONArray("announcements"));
                    break;
                case "items":
                    response.put("data", systemData.getJSONArray("items"));
                    break;
                case "codes":
                    response.put("data", systemData.getJSONArray("codes"));
                    break;
                case "usage_codes":
                    response.put("data", systemData.getJSONArray("usageCodes"));
                    break;
                default:
                    return createErrorResponse("未知数据类型");
            }
            
            return response.toString();
        } catch (JSONException e) {
            return createErrorResponse("无效的数据请求");
        }
    }
    
    private static String createSuccessResponse(String message) {
        JSONObject response = new JSONObject();
        response.put("status", "success");
        response.put("message", message);
        return response.toString();
    }
    
    private static String createErrorResponse(String message) {
        JSONObject response = new JSONObject();
        response.put("status", "error");
        response.put("message", message);
        return response.toString();
    }
    
    private static void loadData() {
        try {
            File file = new File(DATA_FILE);
            if (file.exists()) {
                Scanner scanner = new Scanner(file);
                StringBuilder jsonBuilder = new StringBuilder();
                while (scanner.hasNextLine()) {
                    jsonBuilder.append(scanner.nextLine());
                }
                scanner.close();
                
                systemData = new JSONObject(jsonBuilder.toString());
            } else {
                // 初始化默认数据
                systemData = new JSONObject();
                systemData.put("version", "1.90.9");
                systemData.put("users", new JSONObject());
                systemData.put("announcements", new JSONArray());
                systemData.put("items", new JSONArray());
                systemData.put("codes", new JSONArray());
                systemData.put("usageCodes", new JSONArray());
                saveData();
            }
        } catch (IOException | JSONException e) {
            System.err.println("加载数据失败: " + e.getMessage());
            systemData = new JSONObject();
        }
    }
    
    private static void saveData() {
        try (FileWriter file = new FileWriter(DATA_FILE)) {
            file.write(systemData.toString(4));
            file.flush();
        } catch (IOException e) {
            System.err.println("保存数据失败: " + e.getMessage());
        }
    }
}
