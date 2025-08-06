/**
 * Script para preparar o código para produção
 * Remove console.logs e outras informações sensíveis
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Diretórios a serem processados
const directories = ["./src"];

// Extensões de arquivos a serem processados
const extensions = [".ts", ".tsx", ".js", ".jsx"];

// Padrões de código a serem removidos em produção
const patterns = [
  // Remover console.logs
  { regex: /console\.log\s*\(.*?\);?/g, replacement: "" },
  { regex: /console\.debug\s*\(.*?\);?/g, replacement: "" },
  { regex: /console\.info\s*\(.*?\);?/g, replacement: "" },
  { regex: /console\.trace\s*\(.*?\);?/g, replacement: "" },

  // Remover debuggers
  { regex: /debugger;?/g, replacement: "" },

  // Remover comentários TODO
  { regex: /\/\/\s*TODO:.*$/gm, replacement: "" },

  // Remover URLs de desenvolvimento
  { regex: /(http|https):\/\/localhost:[0-9]+/g, replacement: "" },
];

// Função para processar um arquivo
function processFile(filePath) {
  try {
    // Ler o conteúdo do arquivo
    let content = fs.readFileSync(filePath, "utf8");
    let modified = false;

    // Aplicar cada padrão
    patterns.forEach((pattern) => {
      const originalContent = content;
      content = content.replace(pattern.regex, pattern.replacement);

      if (originalContent !== content) {
        modified = true;
      }
    });

    // Se o arquivo foi modificado, salvar as alterações
    if (modified) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`✅ Processado: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error);
  }
}

// Função principal
function main() {
  console.log("🚀 Iniciando preparação para produção...");

  // Processar cada diretório
  directories.forEach((dir) => {
    // Construir padrão glob para as extensões
    const pattern = `${dir}/**/*{${extensions.join(",")}}`;

    // Encontrar arquivos
    const files = glob.sync(pattern);

    console.log(`📁 Processando ${files.length} arquivos em ${dir}...`);

    // Processar cada arquivo
    files.forEach(processFile);
  });

  console.log("✨ Preparação para produção concluída!");
}

// Executar função principal
main();
