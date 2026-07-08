import Foundation

// MARK: - Turso HTTP Client
actor TursoClient {
    private let url: String
    private let token: String
    private let session: URLSession
    
    init(url: String, token: String) {
        self.url = url
        self.token = token
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: config)
    }
    
    struct TursoArg: Encodable {
        let type: String
        let value: String
    }
    
    func execute(_ sql: String, args: [Any] = []) async throws -> [[String: Any?]] {
        let tursoArgs = args.map { arg -> TursoArg in
            if let n = arg as? NSNumber {
                return TursoArg(type: "integer", value: n.stringValue)
            }
            return TursoArg(type: "text", value: "\(arg)")
        }
        
        let body: [String: Any] = [
            "requests": [[
                "type": "execute",
                "stmt": [
                    "sql": sql,
                    "args": tursoArgs.map { ["type": $0.type, "value": $0.value] }
                ]
            ]]
        ]
        
        var request = URLRequest(url: URL(string: "\(url)/v2/pipeline")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            let text = String(data: data, encoding: .utf8) ?? ""
            throw NSError(domain: "Turso", code: (response as? HTTPURLResponse)?.statusCode ?? 0, userInfo: [NSLocalizedDescriptionKey: text])
        }
        
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let results = json["results"] as? [[String: Any]],
              let firstResult = results.first else {
            return []
        }
        
        if let error = firstResult["error"] as? [String: Any],
           let message = error["message"] as? String {
            throw NSError(domain: "Turso", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
        }
        
        guard let responseObj = firstResult["response"] as? [String: Any],
              let result = responseObj["result"] as? [String: Any],
              let cols = result["cols"] as? [[String: Any]],
              let rows = result["rows"] as? [[Any]] else {
            return []
        }
        
        let colNames = cols.compactMap { $0["name"] as? String }
        
        return rows.map { row in
            var map = [String: Any?]()
            for (i, colName) in colNames.enumerated() {
                if i < row.count {
                    let cell = row[i]
                    if let cellObj = cell as? [String: Any], let value = cellObj["value"] {
                        map[colName] = value
                    } else {
                        map[colName] = cell
                    }
                }
            }
            return map
        }
    }
}
