import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
import os

def train_model():
    print("--- Starting IMPROVED AI Training ---")
    
    data_dir = './dataset'
    
    # Check if dataset exists
    if not os.path.exists(data_dir):
        print("ERROR: 'dataset' folder is missing!")
        return
    
    # --- THE IMPROVEMENT: DATA AUGMENTATION ---
    # We randomly flip, rotate, and change color slightly so the AI learns better
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),    # Flip left/right
        transforms.RandomRotation(20),        # Rotate slightly
        transforms.ColorJitter(brightness=0.2, contrast=0.2), # Change light
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    try:
        dataset = datasets.ImageFolder(data_dir, transform=transform)
        class_names = dataset.classes 
        print(f"Classes: {class_names}")
        print(f"Total images: {len(dataset)}")
        
        with open("class_names.txt", "w") as f:
            for c in class_names:
                f.write(c + "\n")

        # Batch size 8 is a bit more stable
        train_loader = torch.utils.data.DataLoader(dataset, batch_size=4, shuffle=True)

        # Load Pretrained ResNet18
        model = models.resnet18(pretrained=True)
        
        # FREEZE early layers (Optional, but helps with small data)
        # This keeps the basic "vision" logic of the pretrained model
        for param in model.parameters():
            param.requires_grad = False
            
        # Unfreeze the last few layers so they can learn YOUR pests
        model.fc = nn.Linear(model.fc.in_features, len(class_names))
        for param in model.fc.parameters():
            param.requires_grad = True
        
        # Start Training
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.fc.parameters(), lr=0.001)

        num_epochs = 30 # Increased to 30
        print(f"Training for {num_epochs} epochs...")

        for epoch in range(num_epochs):
            running_loss = 0.0
            correct = 0
            total = 0
            
            for inputs, labels in train_loader:
                optimizer.zero_grad()
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                
                running_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

            accuracy = 100 * correct / total
            print(f"Epoch {epoch+1}/{num_epochs} - Loss: {running_loss:.4f} - Accuracy: {accuracy:.1f}%")

        torch.save(model.state_dict(), 'pest_model.pth')
        print("------------------------------------------------")
        print("SUCCESS: Improved Model saved.")
        print("------------------------------------------------")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    train_model()